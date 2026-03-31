INSERT INTO rooms (slug, title, is_persistent)
VALUES
    ('main', 'Main Room', TRUE),
    ('team', 'Team Room', TRUE),
    ('support', 'Support Room', TRUE)
ON CONFLICT (slug) DO NOTHING;
