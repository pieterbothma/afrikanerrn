# Supabase Storage Setup

## Bucket Creation

Create a storage bucket named `chat-images` in Supabase Dashboard:

1. Go to Storage > Buckets
2. Click "New bucket"
3. Name: `chat-images`
4. Public: Yes (for public URLs)
5. File size limit: 10MB (or as needed)
6. Allowed MIME types: image/jpeg, image/png, image/webp

## Storage Policies

Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');
```

