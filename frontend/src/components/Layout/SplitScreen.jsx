import DeviationForm from "../LeftPanel/DeviationForm";
import ChatPanel from "../RightPanel/ChatPanel";

export default function SplitScreen() {
  return (
    <div className="app-shell">
      <main className="split-screen">
        <section className="split-screen__left">
          <DeviationForm />
        </section>
        <section className="split-screen__right">
          <ChatPanel />
        </section>
      </main>
    </div>
  );
}
