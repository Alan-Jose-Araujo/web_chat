import {useState, useEffect, useRef} from 'react';
import mqtt from 'mqtt';
import {v4 as uuidv4} from 'uuid';

const MQTT_BROKER_URL = 'wss://test.mosquitto.org:8081';
const CHAT_TOPIC = 'ds_ifpe_chat/global';

export default function MessageInput() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const clientRef = useRef(null);
    const seenMessages = useRef(new Set());
    const [senderName, setSenderName] = useState('');
    const [senderNameInput, setSenderNameInput] = useState('');

    useEffect(() => {
        const client = mqtt.connect(MQTT_BROKER_URL);
        clientRef.current = client;

        client.on('connect', () => {
            console.log('Connect to MQTT broker');
            client.subscribe(CHAT_TOPIC, (error) => {
                if (!error)
                    console.log('Subscribed to MQTT broker');
            });
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                if (!seenMessages.current.has(payload.messageId)) {
                    seenMessages.current.add(payload.messageId);
                    setMessages((prev) => [...prev, {topic, text: payload.text, senderName: payload.senderName}]);
                }
            } catch (error) {
                console.log('Error on parse message: ', error);
            }
        })

        return () => {
            if (client.connected)
                client.end();
        };
    }, []);

    function handleSenderNameChange(name)
    {
        setSenderName(name);
        sessionStorage.setItem('chat_sender_name', name);
    }

    function sendMessage()
    {
        if(input.trim() === '') return;
        const message = {
            senderName: senderName,
            text: input,
            messageId: uuidv4(),
        };
        console.table(message)
        const payload = JSON.stringify(message);
        clientRef.current.publish(CHAT_TOPIC, payload);
        setMessages((prev) => [...prev, {topic: CHAT_TOPIC, text:input, messageId: message.messageId, senderName: message.senderName}]);
        seenMessages.current.add(message.messageId);
        setInput('');
    }

    return (
        <>
            <div id='chat-app'>
                <h1>MQTT Web Chat</h1>
                {!senderName.trim() && (
                    <div style={{marginBottom: '20px', marginTop: '15px'}}>
                        <input
                            type='text'
                            placeholder='Your name is'
                            onChange={(event) => setSenderNameInput(event.target.value)}
                        />
                        <button
                            type='button'
                            onClick={() => handleSenderNameChange(senderNameInput)}
                        >
                            Set sender name
                        </button>
                    </div>
                )}
                <div id='messages-container'>
                    {messages.map((message, index) => (
                        <div key={index} style={{marginBottom: '15px'}}>
                            <strong>{message.senderName}:</strong> {message.text}
                        </div>
                    ))}
                </div>
                <div id='send-message'>
                    <input
                        type='text'
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                        disabled={!senderName.trim()}
                        placeholder='Type a message here...'
                    />
                    <button type='button' onClick={sendMessage}>Send</button>
                </div>
            </div>
        </>
    );
}