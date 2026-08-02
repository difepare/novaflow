# NovaFlow

**Organiza tu vida. Fluye.**

NovaFlow es una aplicación web de productividad tipo Kanban, diseñada para organizar tareas de forma simple, visual y enfocada. Incluye múltiples tableros, drag & drop, edición de tareas y un temporizador Pomodoro integrado.

🔗 **Demo en vivo:** [https://novaflow-ashy.vercel.app](https://novaflow-ashy.vercel.app)

---

## ✨ Características

- 🔐 Autenticación con Google
- 📋 Múltiples tableros por usuario
- ✅ Columnas y tareas personalizables
- 🖱️ Drag & Drop entre columnas
- ✏️ Edición de tareas con descripción
- ⏱️ Pomodoro integrado (25/5)
- 🎨 Diseño moderno oscuro con animaciones
- 🔔 Notificaciones toast de feedback
- ☁️ Guardado en tiempo real con Supabase

---

## 🛠️ Tech Stack

| Tecnología | Uso |
|----------|-----|
| **Next.js 15** | Framework principal (App Router) |
| **TypeScript** | Tipado estático |
| **Tailwind CSS** | Estilos |
| **Supabase** | Auth + Base de datos |
| **@dnd-kit** | Drag & Drop |
| **Framer Motion** | Animaciones |
| **Lucide React** | Iconos |
| **react-hot-toast** | Notificaciones |
| **Vercel** | Deploy |

---

## 🚀 Cómo correr el proyecto en local

### 1. Clonar el repositorio

```bash
git clone https://github.com/difepare/novaflow.git
cd novaflow

novaflow/
├── app/
│   ├── page.tsx              # Login
│   ├── login/page.tsx        # Login alterno
│   ├── dashboard/page.tsx    # Tablero principal
│   └── layout.tsx
├── lib/
│   └── supabase.ts           # Cliente de Supabase
├── public/
├── .env.local
└── README.md

🎯 Objetivo del proyecto
NovaFlow nació como un proyecto de aprendizaje y portafolio, con el objetivo de construir una herramienta real de productividad desde cero, aplicando buenas prácticas de frontend moderno, autenticación y base de datos.
No busca competir con Trello o Monday.
Busca ser simple, enfocada y útil.

👨‍💻 Autor
Diego F. Palomino
GitHub: difepare
