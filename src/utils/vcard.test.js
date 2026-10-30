import { describe, expect, it } from 'vitest'
import { contacto, telefono } from '../test/datos'
import { textoCsv, textoVCard } from './vcard'

describe('textoVCard', () => {
  const vcard = textoVCard(contacto())

  it('lleva nombre, área, función y correo', () => {
    expect(vcard).toContain('N:Pérez;Juana;;;')
    expect(vcard).toContain('ORG:Empresa de Prueba;Depto. Pruebas')
    expect(vcard).toContain('TITLE:Analista')
    expect(vcard).toContain('EMAIL;TYPE=WORK:jperez@ejemplo.gob.ar')
  })

  it('pone el número marcable y deja el RPV como nota', () => {
    expect(vcard).toContain('TEL;TYPE=WORK:+541140000001')
    expect(vcard).toContain('NOTE:RPV 20001')
  })

  it('marca los celulares como cell', () => {
    const celular = { ...telefono('1150000002'), tipo: 'movil', href: 'tel:+5491150000002' }
    expect(textoVCard(contacto({ telefonos: [celular] }))).toContain('TEL;TYPE=CELL:+5491150000002')
  })
})

describe('textoCsv', () => {
  const csv = textoCsv([
    contacto({ esTitular: true }),
    contacto({ cuil: '27000000022', apellido: 'Gómez; hija', nombre: 'Ana "Anita"', telefonos: [] }),
  ])
  const filas = csv.replace('﻿', '').trimEnd().split('\r\n')

  it('empieza con BOM, para que Excel lo lea como UTF-8', () => {
    expect(csv.startsWith('﻿')).toBe(true)
  })

  it('usa ";" y una fila por contacto con los encabezados primero', () => {
    expect(filas).toHaveLength(3)
    expect(filas[0]).toBe('Apellido;Nombre;Función;Área;Sigla;Titular;Correo;Teléfono;Celular;Interno;RPV;CUIL')
    expect(filas[1]).toBe('Pérez;Juana;Analista;Depto. Pruebas;DE PRUE;Sí;jperez@ejemplo.gob.ar;(011) 4000-0001;;;20001;20000000011')
  })

  it('entrecomilla las celdas con separadores o comillas', () => {
    expect(filas[2].startsWith('"Gómez; hija";"Ana ""Anita""";')).toBe(true)
  })
})
