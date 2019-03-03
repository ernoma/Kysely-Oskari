
DROP DATABASE IF EXISTS kysely_oskari;
CREATE DATABASE kysely_oskari;

\c kysely_oskari

CREATE EXTENSION IF NOT EXISTS POSTGIS;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP USER IF EXISTS kysely_oskari_user;
CREATE USER kysely_oskari_user WITH PASSWORD '***';
GRANT ALL PRIVILEGES ON DATABASE kysely_oskari to kysely_oskari_user;

DROP TABLE IF EXISTS kysely_oskari_paikat; 
CREATE TABLE kysely_oskari_paikat (
       kysymys varchar,
       tyyppi varchar,
       kategoria varchar,
       kuva_url varchar,
       kuva_lisenssi varchar,
       info_url varchar,
       address varchar,
       x float,
       y float,
       geom geometry(point),
       id uuid NOT NULL DEFAULT uuid_generate_v1mc(),
       CONSTRAINT kysely_oskari_paikat_pkey PRIMARY KEY (id)
)
WITH (
     OIDS=FALSE
);
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kysely_oskari_user;

COPY kysely_oskari_paikat (
      kysymys,
      tyyppi,
      kategoria,
      kuva_url,
      kuva_lisenssi,
      info_url,
      address,
      x,
      y
) FROM '/home/ubuntu/Kysely-Oskari/kysymykset.csv' WITH NULL AS '' CSV HEADER;

UPDATE kysely_oskari_paikat SET geom = ST_SetSRID(ST_MakePoint(x, y), 4326);
