import type { Config } from "tailwindcss";

import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				dark: {
					card: 'hsl(var(--card-dark))',
					background: 'hsl(var(--background-dark))',
					foreground: 'hsl(var(--foreground-dark))',
					primary: 'hsl(var(--primary-dark))',
					'primary-foreground': 'hsl(var(--primary-foreground-dark))',
					secondary: 'hsl(var(--secondary-dark))',
					'secondary-foreground': 'hsl(var(--secondary-foreground-dark))',
					destructive: 'hsl(var(--destructive-dark))',
					'destructive-foreground': 'hsl(var(--destructive-foreground-dark))',
					muted: 'hsl(var(--muted-dark))',
					'muted-foreground': 'hsl(var(--muted-foreground-dark))',
					accent: 'hsl(var(--accent-dark))',
					'accent-foreground': 'hsl(var(--accent-foreground-dark))',
					popover: 'hsl(var(--popover-dark))',
					'popover-foreground': 'hsl(var(--popover-foreground-dark))',
					border: 'hsl(var(--border-dark))',
					input: 'hsl(var(--input-dark))',
					ring: 'hsl(var(--ring-dark))',
					sidebar: 'hsl(var(--sidebar-dark))',
					'sidebar-foreground': 'hsl(var(--sidebar-foreground-dark))',
					'sidebar-primary': 'hsl(var(--sidebar-primary-dark))',
					'sidebar-primary-foreground': 'hsl(var(--sidebar-primary-foreground-dark))',
					'sidebar-accent': 'hsl(var(--sidebar-accent-dark))',
					'sidebar-accent-foreground': 'hsl(var(--sidebar-accent-foreground-dark))',
					'sidebar-border': 'hsl(var(--sidebar-border-dark))',
					'sidebar-ring': 'hsl(var(--sidebar-ring-dark))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
