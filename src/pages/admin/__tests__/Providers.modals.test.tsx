import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProvidersPage from '../../admin/Providers'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../../components/ui/toaster'

vi.mock('../../../lib/adminApi', () => {
  return {
    AdminApi: {
      listProviders: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
      updateProvider: vi.fn().mockResolvedValue({}),
      deleteProvider: vi.fn().mockResolvedValue({}),
      rotateProviderIcsToken: vi.fn().mockResolvedValue({ token: 'tok123' }),
    },
    providerIcsUrl: (slug: string, id: number, token: string) => `http://x/${slug}/${id}?t=${token}`,
  }
})

const { AdminApi } = await import('../../../lib/adminApi')

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/admin/foo/providers`]}>
        <Routes>
          <Route path="/admin/:businessSlug/providers" element={<ProvidersPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  )
}

describe('Providers modals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => cleanup())

  it('opens rename modal, validates, saves and closes', async () => {
    renderPage()
    // Wait for list
    await screen.findByText('Alice')

    await userEvent.click(screen.getByRole('button', { name: /rename/i }))
  const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const input = screen.getByLabelText(/provider name/i)
    // clear to trigger validation
    await userEvent.clear(input)
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    const saveBtn = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)

    await userEvent.type(input, 'Bob')
    expect(saveBtn.disabled).toBe(false)
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(AdminApi.updateProvider).toHaveBeenCalledWith('foo', 1, { id: 1, name: 'Bob' })
    })
  })

  it('opens delete modal and deletes', async () => {
    renderPage()
    await screen.findByText('Alice')

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

  const delBtn = within(dialog).getByRole('button', { name: /^delete$/i })
    await userEvent.click(delBtn)

    await waitFor(() => {
      expect(AdminApi.deleteProvider).toHaveBeenCalledWith('foo', 1)
    })
  })
})
