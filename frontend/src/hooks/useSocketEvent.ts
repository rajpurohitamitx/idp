import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event]);
}
