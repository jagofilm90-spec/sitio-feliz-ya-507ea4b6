-- Add foreign key constraint for capturado_por to fix evidence display
ALTER TABLE recepciones_evidencias 
ADD CONSTRAINT recepciones_evidencias_capturado_por_fkey 
FOREIGN KEY (capturado_por) REFERENCES profiles(id);