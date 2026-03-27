// ═══════════════════════════════════════════════════════════
//  src/pages/api/socket.ts — Servidor Socket.io
//  Usa src/engine/gameEngine.ts exclusivamente.
// ═══════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

import {
  getOrCreateRoom,
  getRoom,
  saveRoom,
  resetRoom,
  joinRoom,
  selectClass,
  setPlayerReady,
  selectMap,
  buyItem,
  toggleShopReady,
  processAction,
  useTransform,
  clearUlt,
  proceedToNextMap,
  handleDisconnect,
} from '@/engine/gameEngine';

import type { MapId, ClassType } from '@/engine/types';

// ─── Tipos internos ───────────────────────────────────────

interface SocketServer extends HTTPServer {
  io?: IOServer;
}

interface SocketWithServer extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithServer;
}

const ROOM_ID = 'main';

// ─── Handler HTTP (inicializa o servidor uma vez) ──────────

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new IOServer(res.socket.server as any, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  res.socket.server.io = io;

  // ─── Eventos por conexão ─────────────────────────────────

  io.on('connection', (socket) => {
    const playerId = socket.id;

    // Envia estado atual ao conectar
    const initial = getOrCreateRoom(ROOM_ID);
    socket.emit('game_state', initial);

    // ── Entrar na sala ──
    socket.on('player_join', ({ name }: { name: string }) => {
      const state = getOrCreateRoom(ROOM_ID);
      const updated = joinRoom(state, playerId, name);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Selecionar classe ──
    socket.on('select_class', ({ classType }: { classType: ClassType }) => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = selectClass(state, playerId, classType);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Confirmar classe (pronto) ──
    socket.on('player_ready', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = setPlayerReady(state, playerId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Selecionar mapa ──
    socket.on('select_map', ({ mapId }: { mapId: MapId }) => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = selectMap(state, playerId, mapId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Comprar item ──
    socket.on('buy_item', ({ itemId }: { itemId: string }) => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = buyItem(state, playerId, itemId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Pronto na loja ──
    socket.on('shop_ready', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = toggleShopReady(state, playerId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Ação de combate (ataque, skill, poção) ──
    socket.on(
      'player_action',
      (action: { type: string; targetId?: string; skillIndex?: number; itemId?: string }) => {
        const state = getRoom(ROOM_ID);
        if (!state) return;
        const updated = processAction(state, playerId, action);
        saveRoom(updated);
        io.emit('game_state', updated);
      }
    );

    // ── Transformação ──
    socket.on('use_transform', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = useTransform(state, playerId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Limpar cutscene de ULT ──
    socket.on('clear_ult', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = clearUlt(state);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Avançar para próximo mapa ──
    socket.on('proceed_to_next_map', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = proceedToNextMap(state);
      saveRoom(updated);
      io.emit('game_state', updated);
    });

    // ── Reset total ──
    socket.on('reset_game', () => {
      resetRoom(ROOM_ID);
      const fresh = getOrCreateRoom(ROOM_ID);
      io.emit('game_state', fresh);
    });

    // ── Desconexão ──
    socket.on('disconnect', () => {
      const state = getRoom(ROOM_ID);
      if (!state) return;
      const updated = handleDisconnect(state, playerId);
      saveRoom(updated);
      io.emit('game_state', updated);
    });
  });

  res.end();
}