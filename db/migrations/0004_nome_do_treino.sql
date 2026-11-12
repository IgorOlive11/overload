-- Nome do treino de cada dia ("Superior A", "Empurrar"), como no montador do mock.
alter table overload.protocolo_dias add column nome text not null default '' check (length(nome) <= 40);
