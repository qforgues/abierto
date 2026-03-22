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
    addBusiness: 'Add your Business',
    login: 'Login',
    myBusiness: 'My Business',
    logout: 'Logout',
    dashboard: 'Dashboard',
    navSubtitle: "What's open in Vieques?",
    register: {
      title: 'Add Your Business',
      subtitle: "Get listed on Abierto and let Vieques know when you're open.",
      sectionInfo: 'Business Info',
      labelName: 'Business Name',
      placeholderName: 'e.g. Playa Snacks',
      labelCategory: 'Category',
      placeholderCategory: 'Select a category…',
      labelDescription: 'Description',
      placeholderDescription: 'Tell customers what you offer…',
      sectionPassword: 'Owner Password',
      passwordHint: "Set a password to protect your business. You'll need it to log in and manage your listing.",
      labelPassword: 'Password',
      placeholderPassword: 'At least 8 characters',
      sectionLocation: 'Location',
      locationHint: 'Used to pin your business on the map. Great for food trucks and mobile stands.',
      btnLocate: '📍 Use My Current Location',
      btnLocating: 'Getting location…',
      labelLat: 'Latitude',
      labelLon: 'Longitude',
      btnSubmit: 'Register Business →',
      btnSubmitting: 'Registering…',
      errName: 'Business name is required.',
      errPassword: 'Password is required.',
      errPasswordLen: 'Password must be at least 8 characters.',
      errLocation: 'Could not get location. Enter manually.',
    },
    success: {
      title: "You're on Abierto!",
      subtitle: 'is now listed. Here\'s your login code:',
      tapCopy: 'Tap to copy',
      copied: '✅ Copied!',
      warning: '⚠️ Save this code now.',
      warningBody: 'This is the only way to log in to your business. Screenshot it or write it down. It cannot be recovered if lost.',
      btnDashboard: 'Go to My Dashboard →',
      btnLoading: 'Loading…',
      btnHome: 'Back to Home',
    },
  },
  es: {
    categories: {
      All: 'Todo', Restaurant: 'Restaurante', 'Food Truck': 'Food Truck',
      Bar: 'Bar', Cafe: 'Café', Shop: 'Tienda', Service: 'Servicio',
      Beach: 'Playa', Other: 'Otro', Closed: 'Cerrado',
    },
    noBusinesses: 'No hay negocios todavía.',
    addYours: '¡Añade el tuyo!',
    addBusiness: 'Añade tu Negocio',
    login: 'Entrar',
    myBusiness: 'Mi Negocio',
    logout: 'Salir',
    dashboard: 'Panel',
    navSubtitle: '¿Qué está abierto en Vieques?',
    register: {
      title: 'Añade tu Negocio',
      subtitle: 'Regístrate en Abierto y dile a Vieques cuándo estás abierto.',
      sectionInfo: 'Info del Negocio',
      labelName: 'Nombre del Negocio',
      placeholderName: 'ej. Playa Snacks',
      labelCategory: 'Categoría',
      placeholderCategory: 'Selecciona una categoría…',
      labelDescription: 'Descripción',
      placeholderDescription: '¿Qué ofreces a tus clientes?',
      sectionPassword: 'Contraseña del Dueño',
      passwordHint: 'Crea una contraseña para proteger tu negocio. La necesitarás para iniciar sesión.',
      labelPassword: 'Contraseña',
      placeholderPassword: 'Mínimo 8 caracteres',
      sectionLocation: 'Ubicación',
      locationHint: 'Para ubicar tu negocio en el mapa. Ideal para food trucks y puestos móviles.',
      btnLocate: '📍 Usar Mi Ubicación Actual',
      btnLocating: 'Obteniendo ubicación…',
      labelLat: 'Latitud',
      labelLon: 'Longitud',
      btnSubmit: 'Registrar Negocio →',
      btnSubmitting: 'Registrando…',
      errName: 'El nombre del negocio es obligatorio.',
      errPassword: 'La contraseña es obligatoria.',
      errPasswordLen: 'La contraseña debe tener al menos 8 caracteres.',
      errLocation: 'No se pudo obtener la ubicación. Ingrésala manualmente.',
    },
    success: {
      title: '¡Ya estás en Abierto!',
      subtitle: 'ya está registrado. Tu código de acceso:',
      tapCopy: 'Toca para copiar',
      copied: '✅ ¡Copiado!',
      warning: '⚠️ Guarda este código ahora.',
      warningBody: 'Es la única forma de acceder a tu negocio. Tómale una captura o escríbelo. No se puede recuperar si se pierde.',
      btnDashboard: 'Ir a Mi Panel →',
      btnLoading: 'Cargando…',
      btnHome: 'Volver al Inicio',
    },
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
