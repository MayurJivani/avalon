import { AnimatePresence, MotionConfig } from 'motion/react';
import { useState } from 'react';
import { useStore } from './store.ts';
import { Landing } from './screens/Landing.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { RoleReveal } from './screens/RoleReveal.tsx';
import { Board } from './screens/Board.tsx';
import { Results } from './screens/Results.tsx';
import { ErrorSlip, Spinner } from './ui/bits.tsx';

export function App() {
  const { state, connected } = useStore();
  const [, bump] = useState(0);
  const inRoomUrl = /^\/r\/[A-Z]{5}$/i.test(location.pathname);

  let screen: React.ReactNode;
  if (!state) {
    screen = !connected && inRoomUrl ? <div className="grid min-h-[100dvh] place-items-center"><Spinner label="Finding your table…" /></div> : <Landing />;
  } else {
    const { room, me, secret } = state;
    const g = room.game;
    const seenKey = `avalon:seen:${room.code}:${room.started}`;
    if (!g) screen = <Lobby />;
    else if (g.phase === 'over') screen = <Results room={room} me={me} />;
    else {
      screen = (
        <>
          <Board room={room} me={me} secret={secret!} />
          <AnimatePresence>
            {!sessionStorage.getItem(seenKey) && (
              <RoleReveal key={seenKey} secret={secret!} members={room.members} onDone={() => { sessionStorage.setItem(seenKey, '1'); bump((x) => x + 1); }} />
            )}
          </AnimatePresence>
        </>
      );
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      {screen}
      {state && !connected && (
        <div className="fixed left-1/2 top-3 z-[95] -translate-x-1/2 bg-yolk px-4 py-2 font-display uppercase text-ink shadow-lg" role="status">
          Connection lost · reconnecting
        </div>
      )}
      <ErrorSlip />
    </MotionConfig>
  );
}
