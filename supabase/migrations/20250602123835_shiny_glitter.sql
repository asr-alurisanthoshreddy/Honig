-- Create responses table
create table public.responses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  trigger_type text not null,
  trigger_words text[] not null,
  response_text text not null
);

-- Enable RLS for responses table
alter table public.responses enable row level security;

-- Allow public read access to responses
create policy "Anyone can read responses"
  on public.responses for select
  using (true);

-- Insert default responses
insert into public.responses (trigger_type, trigger_words, response_text) values
  ('greeting', '{hi,hello,hey}', 'Hello! How can I help you today?'),
  ('farewell', '{bye,goodbye,cya,see you}', 'Goodbye! Have a great day!'),
  ('thanks', '{thank,thanks,thank you}', 'You''re welcome! Let me know if you need anything else.'),
  ('how_are_you', '{how are you}', 'I''m doing well, thank you for asking! How can I assist you?'),
  ('default', '{default}', 'I understand your message. How can I help you further?');