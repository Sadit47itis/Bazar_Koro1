import mongoose from 'mongoose'

export interface IProduct {
  name: string
  description: string
  price: number
  category?: string
  stockQuantity: number     // Added for inventory
  isOutOfStock: boolean     // Added for inventory
  storeId: mongoose.Types.ObjectId
  weight?: number
  imageUrl: string          // Notice it's imageUrl, not image
  sponsored: boolean
  location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  adBudget?: number         // Ad budget in Taka for promotion
  isPromoted?: boolean      // Whether product is currently promoted
  promotedUntil?: Date      // When the promotion expires
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true }, // Required!
    price: { type: Number, required: true },
    category: { type: String, default: 'general' },
    stockQuantity: { type: Number, default: 0 },   // Added
    isOutOfStock: { type: Boolean, default: false }, // Added
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    weight: { type: Number, default: 1 },
    imageUrl: { type: String, required: true },    // Required!
    sponsored: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    adBudget: { type: Number, default: 0, min: 0 },      // Promotion budget
    isPromoted: { type: Boolean, default: false, index: true }, // Quick filter for promoted items
    promotedUntil: { type: Date, default: null },         // Expiry of promotion
  },
  { timestamps: true }
)

productSchema.index({ location: '2dsphere' }, { sparse: true })

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: any) {
    ret.id = ret._id
    delete ret._id
  },
})

export default mongoose.model<IProduct>('Product', productSchema)