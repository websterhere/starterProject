// lib/tools/tempratureConvert.ts
import { z } from 'zod';
import { tool } from 'ai';

export const convertTemperature = tool({
  name: 'convertTemperature',
  description: 'Convert temperature between Celsius and Fahrenheit. Provide a numeric value and the unit (C for Celsius, F for Fahrenheit).', // Slightly enhanced description for even greater clarity
  parameters: z.object({
    value: z.number().describe('Temperature value to convert'),
    unit: z.enum(['C', 'F']).describe('Unit of the input value: C or F'),
  }),
  async execute({ value, unit }) {
    if (unit === 'C') {
      const fahrenheit = (value * 9) / 5 + 32;
      return `${value}°C is ${fahrenheit.toFixed(2)}°F.`;
    } else {
      const celsius = ((value - 32) * 5) / 9;
      return `${value}°F is ${celsius.toFixed(2)}°C.`;
    }
  },
});