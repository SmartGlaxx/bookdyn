-- Drop the anonymous access policy since we now have proper authentication
DROP POLICY IF EXISTS "Allow anonymous access for demo" ON public.books;

-- Ensure the authenticated user policies are using PERMISSIVE instead of RESTRICTIVE
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Users can create their own books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;

-- Recreate as permissive policies (default is PERMISSIVE)
CREATE POLICY "Users can view their own books" 
ON public.books 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own books" 
ON public.books 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books" 
ON public.books 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books" 
ON public.books 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);