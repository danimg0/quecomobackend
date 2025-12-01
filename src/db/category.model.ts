import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

export const CategoryModel = mongoose.model("Category", CategorySchema);

export const getCategories = () => CategoryModel.find();
export const createCategory = (values: Record<string, any>) => {
  //Retorno la categoria creada. El toObjetct le quitaba la caca (revisar)
  new CategoryModel(values).save().then((c) => c.toObject());
};
export const getCategoryById = (id: string) => CategoryModel.findById(id);
