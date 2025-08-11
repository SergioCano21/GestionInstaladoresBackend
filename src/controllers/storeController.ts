import expressAsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import Store from '../models/storeModel';
import { IStore } from '../types/models';
import { HydratedDocument } from 'mongoose';

const createStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    numStore,
    phone,
    district,
    address,
    state,
    country,
  }: {
    name: string;
    numStore: number;
    phone: string;
    district: string;
    address: string;
    state: string;
    country: string;
  } = req.body;

  if (
    !name ||
    !address ||
    !state ||
    !country ||
    !numStore ||
    !district ||
    !phone
  ) {
    res.status(400);
    throw new Error('Faltan datos de la tienda');
  }

  const storeExists = await Store.findOne({ numStore });
  if (storeExists) {
    res.status(400);
    throw new Error('Ya existe una tienda con el mismo numero de tienda');
  }

  const newStore = await Store.create({
    name,
    numStore,
    phone,
    address,
    district,
    state,
    country,
  });

  res.status(201).json({
    message: 'Tienda creada correctamente',
    store: newStore,
    error: false,
  });
});

const deleteStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

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
    message: 'Tienda eliminada correctamente',
    store: deletedStore,
    error: false,
  });
});

const findStores = expressAsyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const installer = req.installer;

  if (admin) {
    let query: Partial<IStore> = {};

    switch (admin.role) {
      case 'national':
        query.country = admin.country ?? '';
        break;
      case 'district':
        query.district = admin.district ?? '';
        break;
      case 'local':
        query._id = admin.storeId;
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

    res.status(200).json({
      stores,
      error: false,
      message: 'Tiendas encontradas',
    });
  } else {
    if (!installer) {
      res.status(400);
      throw new Error('No se encontró el instalador');
    }
    const stores = await Store.find({ _id: { $in: installer.storeId } });
    res.status(200).json({
      error: false,
      message: 'Tiendas encontradas',
      stores,
    });
  }
});

const updateStore = expressAsyncHandler(async (req: Request, res: Response) => {
  const { name, numStore, phone, address, district, state, country } = req.body;

  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error('No se proporcionó el id de la tienda');
  }

  const store = await Store.findOne({ _id: id, deleted: false });

  if (!store) {
    res.status(404);
    throw new Error('No se encontró la tienda');
  }

  if (name && name !== store.name) store.name = name;
  if (numStore && numStore !== store.numStore) store.numStore = numStore;
  if (phone && phone !== store.phone) store.phone = phone;
  if (address && address !== store.address) store.address = address;
  if (district && district !== store.district) store.district = district;
  if (state && state !== store.state) store.state = state;
  if (country && country !== state.country) store.country = country;

  const exists = await Store.findOne({ numStore: store.numStore });

  if (exists && store._id.toString() != exists._id.toString()) {
    res.status(400);
    throw new Error('Ya existe una tienda con ese numero de tienda');
  }

  const updatedStore: HydratedDocument<IStore> = await store.save();

  res.status(200).json({
    store: updatedStore,
    message: 'Tienda actualizada correctamente',
    error: false,
  });
});

const restoreStore = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400);
      throw new Error('No se proporcionó el id de la tienda');
    }

    const store = await Store.findOne({ _id: id, deleted: true });

    if (!store) {
      res.status(404);
      throw new Error('No se encontró la tienda');
    }

    store.deleted = false;

    await store.save();

    res.status(200).json({
      message: 'Tienda restaurada correctamente',
      error: false,
    });
  },
);

export { createStore, deleteStore, findStores, updateStore, restoreStore };
