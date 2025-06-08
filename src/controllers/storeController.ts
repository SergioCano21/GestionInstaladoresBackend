import expressAsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import Store from '../models/storeModel';
import { IStore } from '../types/models';
import { HydratedDocument } from 'mongoose';

const createStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    city,
    state,
    country,
  }: { name: string; city: string; state: string; country: string } = req.body;

  if (!name || !city || !state || !country) {
    res.status(400);
    throw new Error('Faltan datos de la tienda');
  }

  const storeExists = await Store.findOne({
    name,
    city,
    state,
  });
  if (storeExists) {
    res.status(400);
    throw new Error('Ya existe una tienda con las mismas características');
  }

  const newStore = await Store.create({ name, city, state, country });

  res.status(201).json({
    message: 'Tienda creada correctamente',
    store: newStore,
    error: false,
  });
});

const deleteStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const { id }: { id: string } = req.body;

  if (!id) {
    res.status(400);
    throw new Error('Error al intentar borrar la tienda');
  }

  const deletedStore = await Store.findByIdAndUpdate(
    id,
    { deleted: true },
    { new: true },
  );
  if (!deletedStore || !deletedStore.deleted) {
    res.status(400);
    throw new Error('Error al intentar borrar la tienda');
  }
  res.status(200).json({
    message: 'Tienda borrada correctamente',
    store: deletedStore,
    error: false,
  });
});

const findByAccess = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const admin = req.admin;

    if (!admin) {
      res.status(403);
      throw new Error('Acceso no autorizado');
    }

    let query: Partial<IStore> = { deleted: false };

    switch (admin.role) {
      case 'national':
        query.country = admin.country;
        break;
      case 'state':
        query.state = admin.state;
        break;
      case 'city':
        query.city = admin.city;
        break;
      case 'local':
        const localStore = await Store.findOne({
          _id: admin.storeId,
          deleted: false,
        });
        if (!localStore) {
          res.status(404);
          throw new Error('No se encontró la tienda');
        }
        res.status(200).json({ store: localStore, error: false });
        break;
      default:
        res.status(400);
        throw new Error('Rol inválido');
    }

    const stores = await Store.find(query);

    if (!stores.length) {
      res.status(404);
      throw new Error('No se encontraron tiendas');
    }

    res.status(200).json({ store: stores, error: false });
  },
);

const updateStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const { id, name, city, state, country } = req.body;

  const store = await Store.findOne({ _id: id, deleted: false });

  if (!store) {
    res.status(404);
    throw new Error('No se encontró la tienda');
  }

  store.name = name || store.name;
  store.city = city || store.city;
  store.state = state || store.state;
  store.country = country || store.country;

  const query = {
    name: store.name,
    city: store.city,
    state: store.state,
  };

  const exists = await Store.findOne(query);

  if (exists && store._id.toString() != exists._id.toString()) {
    res.status(400);
    throw new Error('Ya existe una tienda con las mismas características');
  }

  const updatedStore: HydratedDocument<IStore> = await store.save();

  res.status(200).json({
    updatedStore,
    error: false,
  });
});

export { createStore, deleteStore, findByAccess, updateStore };
