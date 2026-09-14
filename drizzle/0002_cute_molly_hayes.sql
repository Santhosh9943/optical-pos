CREATE TYPE "public"."receipt_type" AS ENUM('THERMAL_80MM', 'A4_INVOICE');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" varchar(200) DEFAULT 'Santhosh Optical Center' NOT NULL,
	"gstin" varchar(15),
	"phone" varchar(20) DEFAULT '+91 98765 43210' NOT NULL,
	"address" text DEFAULT '123 Optical Plaza, MG Road, Bengaluru - 560001' NOT NULL,
	"default_tax_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"receipt_type" "receipt_type" DEFAULT 'THERMAL_80MM' NOT NULL,
	"branch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "customers_phone_unique_idx";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "primary_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "relation_type" varchar(50) DEFAULT 'Self' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "prescription_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "is_customer_own_frame" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "fitting_note" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_profile" ADD CONSTRAINT "store_profile_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_organization_idx" ON "branches" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_patient_id_customers_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_prescription_id_optical_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."optical_prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_primary_customer_idx" ON "customers" USING btree ("primary_customer_id");--> statement-breakpoint
CREATE INDEX "customers_organization_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_organization_idx" ON "inventory_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_branch_idx" ON "inventory_items" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "invoice_item_patient_idx" ON "invoice_items" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "invoice_item_prescription_idx" ON "invoice_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "invoice_organization_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_branch_idx" ON "invoices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payment_organization_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_branch_idx" ON "payments" USING btree ("branch_id");