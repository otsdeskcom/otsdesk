/**
 * OTS Desk — Column definitions + header auto-mapping
 * ---------------------------------------------------------------------------
 * Shared by import (detect sheet columns) and export (pick columns).
 * HEADMAP lets us recognise the SAME field even when different marketplaces
 * name it differently (e.g. "Buyer Name" / "Ship To Name" → customer_name).
 * ---------------------------------------------------------------------------
 */

// display label for each DB field (used by export headers)
const FIELD_LABELS = {
  serial_no:'S.No', platform_order_id:'Platform Order ID', order_date:'Order Date',
  ship_by:'Ship By', est_delivery:'Est. Delivery', exp_delivery:'Expected Delivery (Carrier)',
  note:'Note', status:'Status', supplier:'Supplier', supplier_order_id:'Supplier Order ID',
  supplier_est_delivery:'Supplier Est. Delivery', sku:'Supplier SKU', qty:'QTY',
  per_item_cost:'Per Item Cost', item_cost:'Total Item Cost', selling_price:'Selling Price',
  prep_cost:'Prep', label_cost:'Label Cost', platform_fee:'Platform Fee', total_cost:'Total Cost',
  net_profit:'Net Profit', margin:'Margin %', refund_amount:'Refund Amt', loss:'Loss',
  carrier:'Carrier', tracking_number:'Tracking #', label_created_date:'Label Created',
  customer_name:'Customer', customer_phone:'Phone', address_line1:'Address 1',
  address_line2:'Address 2', city:'City', state:'State', zip:'ZIP',
};

// normalise a header for matching: lowercase, strip non-alphanumerics
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// aliases each field can appear as in uploaded sheets
const HEADMAP = {
  platform_order_id:['orderid','ordernumber','order','po','purchaseorderid','platformorderid','orderno','salesorderid'],
  order_date:['orderdate','purchasedate','date','dateordered','saledate'],
  ship_by:['shipby','shipbydate','mustshipby','shipbydeadline'],
  est_delivery:['estimateddelivery','estdelivery','deliveryestimate','deliverby','estimatedshipdate'],
  exp_delivery:['expecteddelivery','carrierestimateddelivery','expecteddeliverydate'],
  supplier:['supplier','source','sourcedfrom','store','vendor'],
  supplier_order_id:['supplierorderid','sourceorderid','supplierorder','amazonorderid','vendororderid'],
  supplier_est_delivery:['supplierestdelivery','supplierestimateddelivery','sourcedeliveryest'],
  sku:['sku','suppliersku','itemsku','sellersku','productsku'],
  qty:['qty','quantity','units','itemquantity','orderqty'],
  per_item_cost:['peritemcost','unitcost','itemcost','costperitem','cogs'],
  selling_price:['sellingprice','saleprice','ordertotal','totalprice','itemprice','revenue','total','grandtotal'],
  prep_cost:['prep','prepcost','preparationcost'],
  label_cost:['labelcost','shippingcost','shippinglabel','postage','shipcost'],
  platform_fee:['platformfee','marketplacefee','commission','referralfee','walmartfee','fee','fees','sellingfee'],
  carrier:['carrier','shippingcarrier','courier','shipcarrier'],
  tracking_number:['tracking','trackingnumber','trackingno','trackingid','trackingnum'],
  label_created_date:['labelcreated','labeldate','labelcreateddate'],
  status:['status','orderstatus','fulfillmentstatus'],
  note:['note','notes','memo','comments'],
  refund_amount:['refund','refundamount','refunded'],
  customer_name:['customername','buyername','shiptoname','customer','recipient','name','buyer'],
  customer_phone:['phone','customerphone','buyerphone','phonenumber','contactphone'],
  address_line1:['address1','addressline1','shiptoaddress','streetaddress','address','shipaddress1'],
  address_line2:['address2','addressline2','apt','suite','shipaddress2'],
  city:['city','shiptocity','shipcity'],
  state:['state','province','shiptostate','shipstate'],
  zip:['zip','zipcode','postalcode','postcode','shiptozip'],
};

const NUMERIC = new Set(['qty','per_item_cost','selling_price','prep_cost','label_cost','platform_fee','refund_amount']);

// status text from a sheet → our enum
const STATUS_ALIASES = {
  toship:'to_ship', labelcreated:'label_created', preparing:'preparing', onhold:'on_hold',
  ontheway:'on_the_way', intransit:'in_transit', outfordelivery:'out_for_delivery',
  delivered:'delivered', completed:'completed', complete:'completed', cancelled:'cancelled',
  canceled:'cancelled', refunded:'refunded', shipped:'in_transit', new:'to_ship', pending:'to_ship',
};

/** map a sheet's header row → { header: dbField } */
function detectColumns(headers) {
  const map = {};
  for (const h of headers) {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(HEADMAP)) {
      if (aliases.includes(n) && !Object.values(map).includes(field)) { map[h] = field; break; }
    }
  }
  return map;
}

/** pull a typed value for a field out of a raw sheet row */
function cellValue(row, map, field) {
  const header = Object.keys(map).find(k => map[k] === field);
  if (!header) return undefined;
  let v = row[header];
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v === '' || v == null) return undefined;
  if (field === 'status') {
    const s = STATUS_ALIASES[norm(v)];
    return s || undefined;
  }
  if (NUMERIC.has(field)) {
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? undefined : n;
  }
  return String(v).trim();
}

module.exports = { FIELD_LABELS, HEADMAP, NUMERIC, detectColumns, cellValue, norm };
