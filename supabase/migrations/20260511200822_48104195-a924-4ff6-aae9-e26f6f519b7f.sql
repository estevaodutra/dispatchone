ALTER TABLE public.group_execution_lists
ADD COLUMN IF NOT EXISTS sequence_id uuid NULL REFERENCES public.message_sequences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gel_sequence_id ON public.group_execution_lists(sequence_id);