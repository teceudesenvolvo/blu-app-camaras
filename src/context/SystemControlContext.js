import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { firestore } from '../../services/firebaseConfig';
import { DEFAULT_MODULE_SETTINGS } from '../config/mobileModules';

const SystemControlContext = createContext(null);

const mergeSettings = (current, data = {}) => ({
  ...current,
  ...data,
  tenant: { ...current.tenant, ...(data.tenant || {}) },
  design: { ...current.design, ...(data.design || {}) },
  branding: { ...current.branding, ...(data.branding || {}) },
  integrations: { ...current.integrations, ...(data.integrations || {}) },
  apiFeatures: { ...current.apiFeatures, ...(data.apiFeatures || {}) },
  modules: Object.fromEntries(
    Object.keys({ ...DEFAULT_MODULE_SETTINGS, ...(data.modules || {}) }).map(id => [
      id,
      { ...(DEFAULT_MODULE_SETTINGS[id] || {}), ...(data.modules?.[id] || {}) },
    ]),
  ),
});

const defaults = {
  appBottomBarModules: ['servicos', 'licitacoes', 'mensagens'],
  tenant: { name: '', shortName: '', city: '', state: '', phone: '', email: '', website: '' },
  design: {
    primaryColor: '#025AA1', secondaryColor: '#0284C7', accentColor: '#F59E0B', backgroundColor: '#F3F8FE', textColor: '#10233F',
    darkBackgroundColor: '#071827', darkSurfaceColor: '#133450', darkRaisedSurfaceColor: '#143957',
    darkTextColor: '#E8F2FB', darkStrongTextColor: '#F4F9FD', darkMutedTextColor: '#B9CEE0',
    darkBorderColor: '#315D7D', darkInputBackgroundColor: '#102F49', darkPrimaryColor: '#42A9D5', darkAccentColor: '#FBBF24',
    borderRadius: 14,
  },
  branding: { logoUrl: '', compactLogoUrl: '', loginCoverUrl: '', logoAlt: 'Câmara Municipal' },
  integrations: {
    functionsBaseUrl: '',
    publicApiUrl: '',
    youtubeApiUrl: '',
    legislativeApi: { enabled: false, url: '', fields: {} },
    procurementApi: {
      enabled: false,
      provider: 'PNCP',
      organizationCnpj: '',
      url: '',
      responsePath: '',
      fields: {},
    },
  },
  apiFeatures: {}, modules: DEFAULT_MODULE_SETTINGS, appHomeModules: [],
};

export function SystemControlProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => onSnapshot(doc(firestore, 'system-control', 'portal'), snapshot => {
    setSettings(current => mergeSettings(current, snapshot.exists() ? snapshot.data() : {}));
    setLoading(false);
    setError(null);
  }, failure => {
    console.warn('Falha ao carregar o Controle do Sistema:', failure.code || failure.message);
    setError(failure);
    setLoading(false);
  }), []);

  const value = useMemo(() => ({ settings, loading, error }), [settings, loading, error]);
  return <SystemControlContext.Provider value={value}>{children}</SystemControlContext.Provider>;
}

export const useSystemControl = () => useContext(SystemControlContext) || { settings: defaults, loading: true, error: null };
