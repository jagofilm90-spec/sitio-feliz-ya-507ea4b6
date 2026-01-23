-- Add wifi_ssids column to bodegas table for WiFi-based detection
ALTER TABLE bodegas 
ADD COLUMN wifi_ssids text[] DEFAULT '{}';

-- Configure Bodega 1 with both networks (office and warehouse)
UPDATE bodegas SET 
  wifi_ssids = ARRAY['La Manita', 'Bodega']
WHERE nombre = 'Bodega 1';

-- Configure Bodega 2
UPDATE bodegas SET 
  wifi_ssids = ARRAY['Bodega 2']
WHERE nombre = 'Bodega 2';

-- Add comment for documentation
COMMENT ON COLUMN bodegas.wifi_ssids IS 'Array of WiFi network SSIDs used for automatic warehouse detection on tablets';