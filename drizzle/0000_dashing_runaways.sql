CREATE TYPE "public"."coating" AS ENUM('NONE', 'ANTI_REFLECTIVE', 'SCRATCH_RESISTANT', 'UV400', 'HYDROPHOBIC', 'BLUE_FILTER');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."inventory_category" AS ENUM('FRAME', 'SUNGLASS', 'OPHTHALMIC_LENS', 'CONTACT_LENS', 'ACCESSORY', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."lens_material" AS ENUM('CR39', 'POLYCARBONATE', 'TRIVEX', 'HIGH_INDEX_167', 'HIGH_INDEX_174');--> statement-breakpoint
CREATE TYPE "public"."lens_type" AS ENUM('SINGLE_VISION', 'BIFOCAL', 'PROGRESSIVE', 'PHOTOCHROMIC', 'BLUE_CUT', 'PLANO');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'ORDERED', 'SENT_TO_LAB', 'IN_FITTING', 'READY_FOR_COLLECTION', 'DELIVERED_AND_CLOSED', 'CANCELLED_REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('CASH', 'UPI', 'CARD', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PARTIAL', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'OPTOMETRIST', 'CLERK');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(15) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"age" integer,
	"gender" "gender",
	"address_line1" text,
	"address_line2" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(10),
	"gstin" varchar(15),
	"advance_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50) NOT NULL,
	"barcode" varchar(50),
	"category" "inventory_category" NOT NULL,
	"brand" varchar(100),
	"model" varchar(150),
	"description" text,
	"cost_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"mrp" numeric(12, 2),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"hsn_code" varchar(10),
	"lens_type" "lens_type",
	"coating" "coating",
	"lens_material" "lens_material",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"inventory_item_id" uuid,
	"description" varchar(300) NOT NULL,
	"hsn_code" varchar(10),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_per_unit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lens_type" "lens_type",
	"coating" "coating",
	"lens_material" "lens_material",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"prescription_id" uuid,
	"order_status" "order_status" DEFAULT 'DRAFT' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"taxable_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) NOT NULL,
	"advance_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"promised_delivery_date" timestamp with time zone,
	"lab_job_ticket_number" varchar(50),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "optical_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"od_sphere" numeric(5, 2),
	"od_cylinder" numeric(5, 2),
	"od_axis" integer,
	"od_add" numeric(4, 2),
	"od_pd" numeric(4, 1),
	"os_sphere" numeric(5, 2),
	"os_cylinder" numeric(5, 2),
	"os_axis" integer,
	"os_add" numeric(4, 2),
	"os_pd" numeric(4, 1),
	"binocular_pd" numeric(4, 1),
	"od_base_curve" numeric(4, 1),
	"od_diameter" numeric(4, 1),
	"os_base_curve" numeric(4, 1),
	"os_diameter" numeric(4, 1),
	"prism_notes" text,
	"visual_acuity_notes" text,
	"clinical_remarks" text,
	"prescribed_by" uuid,
	"prescribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "od_axis_range" CHECK ("optical_prescriptions"."od_axis" IS NULL OR ("optical_prescriptions"."od_axis" >= 1 AND "optical_prescriptions"."od_axis" <= 180)),
	CONSTRAINT "os_axis_range" CHECK ("optical_prescriptions"."os_axis" IS NULL OR ("optical_prescriptions"."os_axis" >= 1 AND "optical_prescriptions"."os_axis" <= 180))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"transaction_reference" varchar(100),
	"collected_by" uuid,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_prescription_id_optical_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."optical_prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_unique_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_sku_unique_idx" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_barcode_idx" ON "inventory_items" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_brand_model_idx" ON "inventory_items" USING btree ("brand","model");--> statement-breakpoint
CREATE INDEX "inventory_low_stock_idx" ON "inventory_items" USING btree ("stock_quantity","low_stock_threshold");--> statement-breakpoint
CREATE INDEX "invoice_item_invoice_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_item_inventory_idx" ON "invoice_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_number_unique_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoice_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoice_order_status_idx" ON "invoices" USING btree ("order_status");--> statement-breakpoint
CREATE INDEX "invoice_payment_status_idx" ON "invoices" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "invoice_created_at_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoice_prescription_idx" ON "invoices" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "rx_customer_idx" ON "optical_prescriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "rx_prescribed_at_idx" ON "optical_prescriptions" USING btree ("prescribed_at");--> statement-breakpoint
CREATE INDEX "payment_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_paid_at_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "payment_mode_idx" ON "payments" USING btree ("payment_mode");