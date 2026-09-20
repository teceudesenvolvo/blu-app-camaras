import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

const command = (action, payload = {}) => httpsCallable(functions, 'processCommand')({ action, ...payload });

export const tramitarProcesso = (processId, payload) => command('move', { processId, ...payload });
export const solicitarPendencia = (processId, payload) => command('pending', { processId, ...payload });
export const concluirProcesso = processId => command('complete', { processId });
export const arquivarProcesso = processId => command('archive', { processId });
export const receberProcesso = (processId, payload = {}) => command('receive', { processId, ...payload });
