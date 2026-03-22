import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    categories: {
      All: 'All', Restaurant: 'Restaurant', 'Food Truck': 'Food Truck',
      Bar: 'Bar', Cafe: 'Cafe', Shop: 'Shop', Service: 'Service',
      Beach: 'Beach', Other: 'Other', Closed: 'Closed',
    },
    noBusinesses: 'No businesses yet.',
    addYours: 'Add yours!',
    addBusiness: 'Add YOUR Business',
    login: 'Login',
    myBusiness: 'My Business',
    logout: 'Logout',
    dashboard: 'Dashboard',
  },
  es: {
    categories: {
      All: 'Todo', Restaurant: 'Restaurante', 'Food Truck': 'Food Truck',
      Bar: 'Bar', Cafe: 'Café', Shop: 'Tienda', Service: 'Servicio',
      Beach: 'Playa', Other: 'Otro', Closed: 'Cerrado',
    },
    noBusinesses: 'No hay negocios todavía.',
    addYours: '¡Añade el tuyo!',
    addBusiness: 'Añade TU Negocio',
    login: 'Entrar',
    myBusiness: 'Mi Negocio',
    logout: 'Salir',
    dashboard: 'Panel',
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('abierto_lang') || 'en');

  const toggle = () => {
    const next = lang === 'en' ? 'es' : 'en';
    localStorage.setItem('abierto_lang', next);
    setLang(next);
  };

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
