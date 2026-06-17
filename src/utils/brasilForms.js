export const onlyDigits = (value = '') => String(value).replace(/\D/g, '');

export const isValidCpf = (value = '') => {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base, factor) => {
    const total = base
      .split('')
      .reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
};

export const formatCpf = (value = '') => {
  const cpf = onlyDigits(value).slice(0, 11);
  return cpf
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

export const formatCep = (value = '') => {
  const cep = onlyDigits(value).slice(0, 8);
  return cep.replace(/^(\d{5})(\d)/, '$1-$2');
};

export const formatPhone = (value = '') => {
  const phone = onlyDigits(value).slice(0, 11);

  if (phone.length <= 10) {
    return phone
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return phone
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const fetchAddressByCep = async (value = '') => {
  const cep = onlyDigits(value);

  if (cep.length !== 8) {
    throw new Error('CEP inválido.');
  }

  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (!response.ok) {
    throw new Error('CEP não encontrado.');
  }

  const data = await response.json();
  return {
    cep: formatCep(cep),
    address: data.street || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || '',
  };
};
