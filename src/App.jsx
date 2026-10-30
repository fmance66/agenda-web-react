import React, { useState } from 'react';
import { useHotkeys } from '@mantine/hooks';
import { Navigate, Route, Routes } from 'react-router';
import Footer from './components/footer/Footer';
import Header from './components/header/Header';
import Agenda from './components/agenda/Agenda';
import PaletaComandos from './components/agenda/PaletaComandos';
import AvisosApp from './components/comunes/AvisosApp';
import { useRespaldoFavoritos } from './components/favoritos/useRespaldoFavoritos';


const App = () => {
  useRespaldoFavoritos();

  // Ctrl+K (Cmd+K en Mac) abre o cierra la paleta de comandos desde cualquier lugar, también
  // escribiendo en un campo (de ahí la lista vacía de etiquetas a ignorar)
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  useHotkeys([['mod+K', () => setPaletaAbierta((abierta) => !abierta)]], []);

  return (
    <div className="app">
      <Header onBuscar={() => setPaletaAbierta(true)} />
      <PaletaComandos abierta={paletaAbierta} onCerrar={() => setPaletaAbierta(false)} />
      <AvisosApp />
      <main className="main">
        <Routes>
          <Route path="/" element={<Agenda />} />
          <Route path="/contacto/:cuil" element={<Agenda />} />
          <Route path="/area/:clave" element={<Agenda />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
