import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

export const runAdministrativeCommand = (moduleId, action, payload = {}) => httpsCallable(functions, 'administrativeCommand')({ moduleId, action, payload });
