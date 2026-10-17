/**
 * 添加 todo 弹窗
 * ------------------------------------------------------------
 * 单输入框：todo 标题（必填，回车确认）
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface AddTodoDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (title: string) => Promise<void> | void
}

export function AddTodoDialog({ open, onClose, onAdd }: AddTodoDialogProps) {
  const toast = useToast()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
  }, [open])

  const handleSubmit = async () => {
    const t = title.trim()
    if (!t) {
      toast('请填写标题', 'error')
      return
    }
    await onAdd(t)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="新建今日待办"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" tone="rose" onClick={() => void handleSubmit()}>
            添加
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        placeholder="待办标题，如：写 PRD 第三章"
        value={title}
        maxLength={60}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void handleSubmit()
          }
        }}
      />
    </Dialog>
  )
}
