import { Avatar, createTheme } from '@mantine/core';

// tema de Mantine con los colores de la agenda
export const theme = createTheme({
  fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
  primaryColor: 'agenda',
  primaryShade: { light: 7, dark: 5 },
  components: {
    // los avatares de iniciales toman un color según el nombre; verde, lima, amarillo, naranja y
    // turquesa, en su variante clara, no llegan al contraste 4.5:1 de WCAG AA
    Avatar: Avatar.extend({
      defaultProps: { allowedInitialsColors: ['blue', 'cyan', 'indigo', 'violet', 'grape', 'pink', 'red'] },
    }),
  },
  colors: {
    // escala del azul de la agenda (#116090 en el tono 7)
    agenda: [
      '#e6f3fa',
      '#cde4f2',
      '#9ec9e5',
      '#6badd8',
      '#4196cd',
      '#2588b7',
      '#1a74a3',
      '#116090',
      '#0b4f78',
      '#053d5f',
    ],
  },
});
