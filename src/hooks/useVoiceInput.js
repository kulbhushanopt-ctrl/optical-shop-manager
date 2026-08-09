import { useEffect, useRef, useState } from "react";

// Wraps the browser's SpeechRecognition API (where available) for quick voice-to-text
// dictation on a single field. Silently no-ops on unsupported browsers.
export function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!recognitionRef.current || listening) return;
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      setListening(false);
    }
  };

  return { listening, supported, start };
}
