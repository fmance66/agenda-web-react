import React from 'react'
import { Link } from 'react-router'
import { ActionIcon, Kbd, Tooltip, UnstyledButton, useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { IconMoon, IconSearch, IconSun } from '@tabler/icons-react'
import './Header.css'

// cambia entre modo claro y oscuro
const BotonTema = () => {
  const { setColorScheme } = useMantineColorScheme()
  const esOscuro = useComputedColorScheme('light') === 'dark'
  const etiqueta = esOscuro ? 'Usar modo claro' : 'Usar modo oscuro'

  return (
    <Tooltip label={etiqueta}>
      <ActionIcon variant="transparent" size="lg" radius="xl" className="header-boton-tema" aria-label={etiqueta}
                  onClick={() => setColorScheme(esOscuro ? 'light' : 'dark')}>
        {esOscuro ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Tooltip>
  )
}

// abre la paleta de comandos; muestra el atajo para que se aprenda
const BotonBuscar = ({ onClick }) => (
  <UnstyledButton className="header-boton-buscar" aria-label="Buscar en la agenda (Ctrl+K)" aria-haspopup="dialog"
                  onClick={onClick}>
    <IconSearch size={18} />
    <span className="header-boton-buscar-texto">Buscar</span>
    <Kbd size="xs" className="header-boton-buscar-tecla">Ctrl K</Kbd>
  </UnstyledButton>
)

const Header = ({ onBuscar }) => {
  return (
    <header className="header" style={{ backgroundImage: 'url("/images/agendaCabecera.png")' }}>
      <div className="header-marca">
        <img src="/images/mainit-logo.svg" alt="Main-IT" className="header-logo" />
        <Link to="/" className="header-titulo">
          Mi <span>Agenda</span>
        </Link>
      </div>
      <div className="header-acciones">
        <BotonBuscar onClick={onBuscar} />
        <BotonTema />
      </div>
    </header>
  )
}

export default Header
