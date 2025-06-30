/*
  # Add DELETE policy for conversations table

  1. Security Changes
    - Add DELETE policy for conversations table to allow users to delete their own conversations
    - This resolves the "conversation still exists in database after deletion" error

  The policy allows authenticated users to delete conversations where they are the owner (user_id matches auth.uid()).
*/

CREATE POLICY "Users can delete their own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);