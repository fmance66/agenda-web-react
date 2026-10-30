import React from 'react'
import { version } from '../../../package.json'
import './Footer.css'


const Footer = () => {
  return (
    <footer className="footer">
        {`Mi Agenda · versión ${version}`}
    </footer>
  )
}

export default Footer
