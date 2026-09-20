import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from './AuthContext';
import { canUseModule } from '../config/mobileModules';
import { useSystemControl } from './SystemControlContext';

const MobileModulesContext = createContext(null);

export function MobileModulesProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { settings, loading: settingsLoading, error: settingsFailure } = useSystemControl();
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setRole('Cidadão');
      setRoleLoading(false);
      return undefined;
    }
    setRoleLoading(true);
    return onSnapshot(doc(firestore, 'users', user.uid), snapshot => {
      setRole(snapshot.data()?.tipo || 'Cidadão');
      setRoleLoading(false);
    }, error => {
      console.warn('Falha ao carregar perfil para módulos:', error.code || error.message);
      setRole('Cidadão');
      setRoleLoading(false);
    });
  }, [user]);

  const value = useMemo(() => ({
    loading: settingsLoading || roleLoading,
    error: Boolean(settingsFailure),
    settings,
    role,
    canUse: id => {
      if (settingsFailure || !canUseModule(settings, role, id)) return false;
      const requiredApi = { tvCamara: 'youtube', notificacoes: 'notifications', mensagens: 'notifications' }[id];
      return !requiredApi || settings?.apiFeatures?.[requiredApi] !== false;
    },
  }), [settingsLoading, roleLoading, settingsFailure, settings, role]);

  return <MobileModulesContext.Provider value={value}>{children}</MobileModulesContext.Provider>;
}

export function useMobileModules() {
  const value = useContext(MobileModulesContext);
  if (!value) throw new Error('MobileModulesProvider ausente');
  return value;
}
