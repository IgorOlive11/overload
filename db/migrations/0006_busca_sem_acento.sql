-- Busca na biblioteca sem acento e sem caixa, como no mock ("triceps" acha "TRÍCEPS").
-- Sem depender da extensão unaccent: troca os acentos do português por translate.
create function overload.sem_acento(t text) returns text
  language sql immutable parallel safe
  set search_path = pg_catalog
  as $$ select lower(translate(t, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')) $$;
grant execute on function overload.sem_acento(text) to overload_api;
