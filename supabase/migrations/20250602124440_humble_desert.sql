-- Greetings
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('greeting', '{hi,hello,hey,howdy,greetings,good morning,good afternoon,good evening,morning,evening,afternoon,yo,hiya}', 'Hello! How can I help you today?'),
  ('greeting_formal', '{dear sir,dear madam,to whom it may concern,greetings and salutations}', 'Greetings! How may I assist you today?'),
  ('greeting_casual', '{sup,wassup,what''s up,whats up,yo what''s up,heya}', 'Hey there! What can I do for you?');

-- Farewells
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('farewell', '{bye,goodbye,see you,farewell,take care,catch you later,later,cya,peace,peace out}', 'Goodbye! Have a great day!'),
  ('farewell_formal', '{regards,best regards,sincerely,yours truly,yours sincerely}', 'Thank you for your time. Have a wonderful day!'),
  ('farewell_night', '{good night,goodnight,night,sweet dreams}', 'Good night! Rest well!');

-- Gratitude
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('thanks', '{thank,thanks,thank you,appreciated,grateful,thx,ty}', 'You''re welcome! Let me know if you need anything else.'),
  ('thanks_emphatic', '{thank you so much,thanks a lot,really appreciate it,many thanks}', 'You''re very welcome! I''m glad I could help!'),
  ('thanks_advance', '{thanks in advance,thank you in advance}', 'You''re welcome! I''ll do my best to assist you.');

-- Well-being
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('how_are_you', '{how are you,how''re you,how you doing,how''s it going,how is it going}', 'I''m doing well, thank you for asking! How can I assist you?'),
  ('good_mood', '{great,awesome,excellent,fantastic,wonderful,amazing}', 'That''s wonderful to hear! How can I make your day even better?'),
  ('bad_mood', '{bad,terrible,awful,not good,horrible,worst}', 'I''m sorry to hear that. How can I help improve your situation?');

-- Help/Assistance
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('help', '{help,assist,support,guidance,need help,can you help}', 'I''d be happy to help! What do you need assistance with?'),
  ('confused', '{confused,don''t understand,dont understand,what do you mean,unclear}', 'Let me clarify that for you. What specifically is unclear?'),
  ('stuck', '{stuck,can''t figure out,cant figure out,having trouble,struggling}', 'I''ll help you work through this. What exactly are you stuck on?');

-- Agreement/Disagreement
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('agree', '{yes,yeah,sure,okay,ok,alright,definitely,absolutely}', 'Great! Let''s proceed with that.'),
  ('disagree', '{no,nope,nah,not really,disagree}', 'I understand. Would you like to explore other options?'),
  ('maybe', '{maybe,perhaps,possibly,not sure,might be}', 'Take your time to consider. I''m here to help when you decide.');

-- Questions
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('what', '{what,what is,what are,what''s}', 'I''ll help you understand that better. Could you please provide more context?'),
  ('how', '{how,how to,how do,how can}', 'I''ll guide you through this process. What specifically would you like to know?'),
  ('why', '{why,why is,why are,why does}', 'Let me explain the reasoning behind that. What exactly are you curious about?');

-- Time-related
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('wait', '{wait,hold on,one moment,give me a minute,just a sec}', 'Take your time! I''ll be here when you''re ready.'),
  ('time_check', '{what time,current time,time now}', 'I can help you with your query, but I don''t track real-time information. What else can I assist you with?'),
  ('duration', '{how long,takes time,duration}', 'The duration can vary. Could you specify what timeline you''re interested in?');

-- Emotions
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('happy', '{happy,glad,pleased,delighted,joy,excited}', 'I''m glad you''re feeling positive! How can I help maintain that energy?'),
  ('sad', '{sad,unhappy,depressed,down,upset}', 'I''m sorry you''re feeling this way. Would you like to talk about what''s bothering you?'),
  ('angry', '{angry,mad,frustrated,annoyed,irritated}', 'I understand your frustration. Let''s work together to find a solution.');

-- Apologies
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('sorry', '{sorry,apologize,my bad,my fault,apologies}', 'No problem at all! Let''s move forward. How can I help?'),
  ('mistake', '{mistake,error,wrong,incorrect,oops}', 'Don''t worry about it! Everyone makes mistakes. Let''s get this sorted out.');

-- Compliments
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('good_job', '{good job,well done,great work,nice work,excellent job}', 'Thank you! I''m here to help make things easier for you.'),
  ('smart', '{smart,intelligent,clever,brilliant,genius}', 'Thank you for the kind words! I aim to be helpful and efficient.');

-- Default responses for unmatched patterns
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('default_general', '{default}', 'I understand your message. How can I help you further?'),
  ('default_question', '{default_question}', 'That''s an interesting question. Could you provide more details so I can help better?'),
  ('default_statement', '{default_statement}', 'I see. Would you like to explore this topic further?');

-- Add indexes for better performance
CREATE INDEX idx_responses_trigger_type ON public.responses (trigger_type);
CREATE INDEX idx_responses_trigger_words ON public.responses USING gin (trigger_words);