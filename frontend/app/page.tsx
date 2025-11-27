import ChatInterface from "@/components/ChatInterface";
import BackgroundEffect from "@/components/BackgroundEffect";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundEffect />
      <ChatInterface />
    </main>
  );
}
