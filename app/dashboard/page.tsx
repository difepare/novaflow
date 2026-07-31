'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, Pencil, LogOut, Play, Pause, RotateCcw, Coffee, Focus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ========== Pomodoro ==========
function PomodoroTimer() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const FOCUS_TIME = 25 * 60
  const BREAK_TIME = 5 * 60

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.5)
    } catch (e) {
      console.log('No se pudo reproducir el sonido')
    }
  }

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            playNotificationSound()
            if (mode === 'focus') {
              setMode('break')
              return BREAK_TIME
            } else {
              setMode('focus')
              return FOCUS_TIME
            }
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, mode])

  const toggleTimer = () => setIsRunning(!isRunning)
  const resetTimer = () => {
    setIsRunning(false)
    setSecondsLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME)
  }
  const switchMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false)
    setMode(newMode)
    setSecondsLeft(newMode === 'focus' ? FOCUS_TIME : BREAK_TIME)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all ${
      mode === 'focus'
        ? 'bg-violet-500/10 border-violet-500/30'
        : 'bg-emerald-500/10 border-emerald-500/30'
    }`}>
      <div className="flex items-center gap-1.5">
        {mode === 'focus' ? (
          <Focus size={14} className="text-violet-400" />
        ) : (
          <Coffee size={14} className="text-emerald-400" />
        )}
        <span className={`text-xs font-medium ${mode === 'focus' ? 'text-violet-300' : 'text-emerald-300'}`}>
          {mode === 'focus' ? 'Foco' : 'Descanso'}
        </span>
      </div>

      <div className={`font-mono text-sm font-semibold tabular-nums ${
        mode === 'focus' ? 'text-violet-200' : 'text-emerald-200'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTimer}
          className={`p-1.5 rounded-lg transition-colors ${
            mode === 'focus'
              ? 'hover:bg-violet-500/20 text-violet-300'
              : 'hover:bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="hidden sm:flex items-center gap-1 ml-1 border-l border-zinc-700 pl-2">
        <button
          onClick={() => switchMode('focus')}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            mode === 'focus' ? 'bg-violet-500/30 text-violet-200' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          25m
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            mode === 'break' ? 'bg-emerald-500/30 text-emerald-200' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          5m
        </button>
      </div>
    </div>
  )
}

// ========== Modal editar tarea ==========
function EditTaskModal({
  task,
  onClose,
  onSave,
}: {
  task: any
  onClose: () => void
  onSave: (id: string, title: string, description: string) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')

  const handleSave = () => {
    if (!title.trim()) return
    onSave(task.id, title.trim(), description.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Editar tarea</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
              placeholder="Agrega más detalles sobre esta tarea..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
            Guardar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ========== Tarea ==========
function TaskCard({
  task,
  onDelete,
  onEdit,
}: {
  task: any
  onDelete: (id: string) => void
  onEdit: (task: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onEdit(task)}
      className="bg-zinc-800/80 backdrop-blur border border-zinc-700/80 rounded-xl p-3.5 text-sm hover:border-violet-500/50 hover:bg-zinc-800 transition-all group/task cursor-pointer shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="leading-relaxed text-white">{task.title}</p>
          {task.description && (
            <p className="text-zinc-500 text-xs mt-1.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover/task:opacity-100 text-zinc-500 hover:text-red-400 transition-all shrink-0 p-0.5"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ========== Columna ==========
function ColumnContainer({
  column,
  tasks,
  onDeleteColumn,
  onDeleteTask,
  onRenameColumn,
  onEditTask,
  addingTaskInColumn,
  setAddingTaskInColumn,
  newTaskTitle,
  setNewTaskTitle,
  onCreateTask,
}: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)

  const handleSaveRename = () => {
    if (editTitle.trim() && editTitle.trim() !== column.title) {
      onRenameColumn(column.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-80 bg-zinc-900/70 backdrop-blur-sm rounded-2xl border flex flex-col group/column transition-all duration-200 ${
        isOver ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-zinc-800/80'
      }`}
    >
      <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') {
                  setEditTitle(column.title)
                  setIsEditing(false)
                }
              }}
              className="bg-zinc-800 border border-violet-500 rounded-lg px-2.5 py-1.5 text-sm text-white w-full focus:outline-none"
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold text-white truncate cursor-pointer hover:text-violet-300 transition-colors"
              onDoubleClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
          )}
          <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full shrink-0 font-medium">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover/column:opacity-100 transition-all">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-violet-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-all">
              <Pencil size={14} />
            </button>
          )}
          <button onClick={() => onDeleteColumn(column.id)} className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="p-3 flex-1 space-y-2.5 min-h-[160px]">
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && addingTaskInColumn !== column.id && (
          <div className="text-center py-8 px-3">
            <p className="text-zinc-600 text-sm">No hay tareas</p>
            <p className="text-zinc-700 text-xs mt-1">Agrega la primera</p>
          </div>
        )}

        {addingTaskInColumn === column.id ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <textarea
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onCreateTask(column.id)
                }
              }}
              placeholder="Escribe el título de la tarea..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => onCreateTask(column.id)} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm py-2 rounded-xl transition-colors font-medium">
                Agregar
              </button>
              <button
                onClick={() => {
                  setAddingTaskInColumn(null)
                  setNewTaskTitle('')
                }}
                className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAddingTaskInColumn(column.id)}
            className="w-full flex items-center gap-2 text-zinc-500 hover:text-white text-sm py-2.5 px-3 rounded-xl hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-700"
          >
            <Plus size={16} />
            Agregar tarea
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ========== Página principal ==========
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [board, setBoard] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<any>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false)
  const [boardTitleInput, setBoardTitleInput] = useState('')

  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [showColumnInput, setShowColumnInput] = useState(false)
  const [addingTaskInColumn, setAddingTaskInColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      let currentBoard = null
      const { data: existingBoards } = await supabase
        .from('boards')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)

      if (existingBoards && existingBoards.length > 0) {
        currentBoard = existingBoards[0]
      } else {
        const { data: newBoard } = await supabase
          .from('boards')
          .insert({ title: 'Mi Tablero', owner_id: user.id })
          .select()
          .single()
        currentBoard = newBoard
      }

      setBoard(currentBoard)
      if (currentBoard) setBoardTitleInput(currentBoard.title)

      if (currentBoard) {
        const { data: cols } = await supabase
          .from('columns')
          .select('*')
          .eq('board_id', currentBoard.id)
          .order('position', { ascending: true })

        if (cols && cols.length > 0) {
          setColumns(cols)
        } else {
          const defaultColumns = [
            { title: 'Por hacer', position: 0 },
            { title: 'En progreso', position: 1 },
            { title: 'Hecho', position: 2 },
          ]
          const { data: createdCols } = await supabase
            .from('columns')
            .insert(defaultColumns.map((col) => ({ ...col, board_id: currentBoard.id })))
            .select()
          if (createdCols) setColumns(createdCols)
        }

        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('board_id', currentBoard.id)
          .order('position', { ascending: true })

        if (existingTasks) setTasks(existingTasks)
      }

      setLoading(false)
    }

    init()
  }, [router])

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim() || !board) return
    const { data, error } = await supabase
      .from('columns')
      .insert({
        title: newColumnTitle.trim(),
        board_id: board.id,
        position: columns.length,
      })
      .select()
      .single()

    if (!error && data) {
      setColumns([...columns, data])
      setNewColumnTitle('')
      setShowColumnInput(false)
      toast.success('Columna creada')
    } else {
      toast.error('No se pudo crear la columna')
    }
  }

  const handleCreateTask = async (columnId: string) => {
    if (!newTaskTitle.trim() || !board) return
    const columnTasks = tasks.filter((t) => t.column_id === columnId)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTaskTitle.trim(),
        column_id: columnId,
        board_id: board.id,
        position: columnTasks.length,
      })
      .select()
      .single()

    if (!error && data) {
      setTasks([...tasks, data])
      setNewTaskTitle('')
      setAddingTaskInColumn(null)
      toast.success('Tarea creada')
    } else {
      toast.error('No se pudo crear la tarea')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(tasks.filter((t) => t.id !== taskId))
      toast.success('Tarea eliminada')
    } else {
      toast.error('No se pudo eliminar la tarea')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('¿Eliminar esta columna y todas sus tareas?')) return
    const { error } = await supabase.from('columns').delete().eq('id', columnId)
    if (!error) {
      setColumns(columns.filter((c) => c.id !== columnId))
      setTasks(tasks.filter((t) => t.column_id !== columnId))
      toast.success('Columna eliminada')
    } else {
      toast.error('No se pudo eliminar la columna')
    }
  }

  const handleRenameColumn = async (columnId: string, newTitle: string) => {
    const { error } = await supabase.from('columns').update({ title: newTitle }).eq('id', columnId)
    if (!error) {
      setColumns(columns.map((c) => (c.id === columnId ? { ...c, title: newTitle } : c)))
      toast.success('Columna actualizada')
    }
  }

  const handleSaveTask = async (taskId: string, title: string, description: string) => {
    const { error } = await supabase.from('tasks').update({ title, description }).eq('id', taskId)
    if (!error) {
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, title, description } : t)))
      toast.success('Tarea actualizada')
    } else {
      toast.error('No se pudo actualizar la tarea')
    }
  }

  const handleSaveBoardTitle = async () => {
    if (!board || !boardTitleInput.trim() || boardTitleInput.trim() === board.title) {
      setIsEditingBoardTitle(false)
      return
    }

    const { error } = await supabase
      .from('boards')
      .update({ title: boardTitleInput.trim() })
      .eq('id', board.id)

    if (!error) {
      setBoard({ ...board, title: boardTitleInput.trim() })
      toast.success('Tablero actualizado')
    }
    setIsEditingBoardTitle(false)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeTaskData = tasks.find((t) => t.id === activeId)
    if (!activeTaskData) return

    const isOverColumn = columns.some((c) => c.id === overId)
    const overTask = tasks.find((t) => t.id === overId)

    let newColumnId = activeTaskData.column_id
    if (isOverColumn) newColumnId = overId
    else if (overTask) newColumnId = overTask.column_id

    if (newColumnId === activeTaskData.column_id) return

    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, column_id: newColumnId } : t)))
    await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', activeId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando tu tablero...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-950 to-violet-950/40 text-white">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #3f3f46',
          },
        }}
      />

      <header className="border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              NovaFlow
            </h1>

            {board && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">/</span>
                {isEditingBoardTitle ? (
                  <input
                    type="text"
                    value={boardTitleInput}
                    onChange={(e) => setBoardTitleInput(e.target.value)}
                    onBlur={handleSaveBoardTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBoardTitle()
                      if (e.key === 'Escape') {
                        setBoardTitleInput(board.title)
                        setIsEditingBoardTitle(false)
                      }
                    }}
                    className="bg-zinc-800 border border-violet-500 rounded-lg px-2 py-1 text-sm text-white focus:outline-none max-w-[180px]"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingBoardTitle(true)}
                    className="text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-1.5 group"
                    title="Editar nombre del tablero"
                  >
                    {board.title}
                    <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          <PomodoroTimer />

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm text-zinc-300">{user?.user_metadata?.full_name || 'Usuario'}</p>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:text-white transition-all"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-5 min-h-[calc(100vh-110px)] items-start pb-6">
            <AnimatePresence>
              {columns.map((column) => {
                const columnTasks = tasks.filter((t) => t.column_id === column.id)
                return (
                  <ColumnContainer
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    onDeleteColumn={handleDeleteColumn}
                    onDeleteTask={handleDeleteTask}
                    onRenameColumn={handleRenameColumn}
                    onEditTask={setEditingTask}
                    addingTaskInColumn={addingTaskInColumn}
                    setAddingTaskInColumn={setAddingTaskInColumn}
                    newTaskTitle={newTaskTitle}
                    setNewTaskTitle={setNewTaskTitle}
                    onCreateTask={handleCreateTask}
                  />
                )
              })}
            </AnimatePresence>

            <div className="w-80 shrink-0">
              {showColumnInput ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/70 backdrop-blur border border-zinc-800 rounded-2xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
                    placeholder="Nombre de la columna..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleCreateColumn} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm py-2 rounded-xl transition-colors font-medium">
                      Agregar
                    </button>
                    <button
                      onClick={() => {
                        setShowColumnInput(false)
                        setNewColumnTitle('')
                      }}
                      className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowColumnInput(true)}
                  className="w-full h-14 bg-zinc-900/30 border-2 border-dashed border-zinc-700 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-zinc-500 hover:bg-zinc-900/50 transition-all"
                >
                  <Plus size={18} />
                  Nueva columna
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="bg-zinc-800 border-2 border-violet-500 rounded-xl p-3.5 text-sm shadow-2xl opacity-95 rotate-1 scale-105">
                {activeTask.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <AnimatePresence>
        {editingTask && (
          <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />
        )}
      </AnimatePresence>
    </div>
  )
}