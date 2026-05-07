interface ConfirmOptions {
  title: string;
  message?: string;
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
}

const state = reactive<{
  open: boolean;
  options: ConfirmOptions;
  resolve: ((v: boolean) => void) | null;
}>({
  open: false,
  options: { title: '' },
  resolve: null,
});

export function useConfirmDialog() {
  function openConfirm(options: ConfirmOptions): Promise<boolean> {
    state.options = options;
    state.open = true;
    return new Promise(resolve => {
      state.resolve = resolve;
    });
  }

  function answer(value: boolean) {
    state.open = false;
    state.resolve?.(value);
    state.resolve = null;
  }

  return { state, openConfirm, answer };
}
