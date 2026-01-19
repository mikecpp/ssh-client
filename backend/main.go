package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

type SSHCredentials struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type SSHSession struct {
	client  *ssh.Client
	session *ssh.Session
	stdin   io.WriteCloser
	mutex   sync.Mutex
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	log.Println("WebSocket connection established")

	var sshSession *SSHSession

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			if sshSession != nil {
				cleanup(sshSession)
			}
			break
		}

		if messageType == websocket.TextMessage {
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("JSON unmarshal error: %v", err)
				continue
			}

			msgType, ok := msg["type"].(string)
			if !ok {
				continue
			}

			switch msgType {
			case "connect":
				if sshSession != nil {
					cleanup(sshSession)
				}

				creds := SSHCredentials{
					Host:     msg["host"].(string),
					Port:     msg["port"].(string),
					Username: msg["username"].(string),
					Password: msg["password"].(string),
				}

				session, err := connectSSH(creds, conn)
				if err != nil {
					errorMsg := map[string]string{
						"type":  "error",
						"error": err.Error(),
					}
					conn.WriteJSON(errorMsg)
					continue
				}

				sshSession = session
				log.Println("SSH connection established")

				successMsg := map[string]string{
					"type":    "connected",
					"message": "SSH connection established",
				}
				conn.WriteJSON(successMsg)

			case "input":
				if sshSession != nil && sshSession.stdin != nil {
					input := msg["data"].(string)
					sshSession.mutex.Lock()
					_, err := sshSession.stdin.Write([]byte(input))
					sshSession.mutex.Unlock()
					if err != nil {
						log.Printf("Error writing to SSH stdin: %v", err)
					}
				}

			case "resize":
				if sshSession != nil && sshSession.session != nil {
					width := int(msg["cols"].(float64))
					height := int(msg["rows"].(float64))
					sshSession.session.WindowChange(height, width)
				}
			}
		}
	}
}

func connectSSH(creds SSHCredentials, wsConn *websocket.Conn) (*SSHSession, error) {
	config := &ssh.ClientConfig{
		User: creds.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(creds.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // Warning: Only for development
	}

	address := fmt.Sprintf("%s:%s", creds.Host, creds.Port)
	client, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to SSH server: %v", err)
	}

	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to create SSH session: %v", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to get stdin pipe: %v", err)
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to get stderr pipe: %v", err)
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm-256color", 24, 80, modes); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to request PTY: %v", err)
	}

	if err := session.Shell(); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to start shell: %v", err)
	}

	sshSession := &SSHSession{
		client:  client,
		session: session,
		stdin:   stdin,
	}

	// Stream stdout to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("Error reading stdout: %v", err)
				}
				return
			}
			if n > 0 {
				msg := map[string]string{
					"type": "output",
					"data": string(buf[:n]),
				}
				if err := wsConn.WriteJSON(msg); err != nil {
					log.Printf("Error writing to WebSocket: %v", err)
					return
				}
			}
		}
	}()

	// Stream stderr to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("Error reading stderr: %v", err)
				}
				return
			}
			if n > 0 {
				msg := map[string]string{
					"type": "output",
					"data": string(buf[:n]),
				}
				if err := wsConn.WriteJSON(msg); err != nil {
					log.Printf("Error writing to WebSocket: %v", err)
					return
				}
			}
		}
	}()

	return sshSession, nil
}

func cleanup(session *SSHSession) {
	if session.session != nil {
		session.session.Close()
	}
	if session.client != nil {
		session.client.Close()
	}
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	// Serve static files from frontend dist (Vite output)
	fs := http.FileServer(http.Dir("../frontend/dist"))
	http.Handle("/", fs)

	port := ":5000"
	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}
