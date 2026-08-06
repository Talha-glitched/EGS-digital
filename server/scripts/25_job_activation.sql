-- EGS ERP: fast activation of a scoped Job into an executable delivery plan.
-- Templates are configurable activity building blocks, not rigid service workflows.

CREATE TABLE IF NOT EXISTS delivery_activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_code VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type VARCHAR(50) NOT NULL,
  days_from_target INTEGER NOT NULL DEFAULT 0,
  duration_hours NUMERIC(8,2) NOT NULL DEFAULT 8 CHECK (duration_hours > 0),
  applicable_service_codes TEXT[] NOT NULL DEFAULT '{}',
  requires_location BOOLEAN NOT NULL DEFAULT FALSE,
  requires_work_package BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_delivery_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
  work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
  location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
  target_date DATE NOT NULL,
  activity_count INTEGER NOT NULL CHECK (activity_count > 0),
  activated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE job_activities
  ADD COLUMN IF NOT EXISTS delivery_activation_id UUID REFERENCES job_delivery_activations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_template_id UUID REFERENCES delivery_activity_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_activity_templates_active
  ON delivery_activity_templates(active, display_order);
CREATE INDEX IF NOT EXISTS idx_job_delivery_activations_job
  ON job_delivery_activations(ongoing_job_id, activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_activities_activation
  ON job_activities(delivery_activation_id) WHERE delivery_activation_id IS NOT NULL;

INSERT INTO delivery_activity_templates
  (stable_code,title,description,activity_type,days_from_target,duration_hours,applicable_service_codes,requires_location,requires_work_package,display_order)
VALUES
  ('site-survey','Site survey','Confirm dimensions, access, fixing surfaces, services and site restrictions.','site_survey',-14,4,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,FALSE,10),
  ('production-design','Production design / artwork','Prepare the exact technical design, artwork or shop drawing used for delivery.','design',-12,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,20),
  ('client-approval','Client approval','Obtain approval for the exact design, artwork or production basis.','client_approval',-9,2,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,30),
  ('procurement','Procurement and supplier coordination','Confirm bought-out materials, outsourced work and supplier delivery dates.','procurement',-8,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,40),
  ('fabrication','Fabrication / production','Manufacture the approved physical deliverables.','fabrication',-7,24,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,50),
  ('printing','Printing and finishing','Print, laminate, mount and finish the approved graphics.','printing',-6,16,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket'],FALSE,TRUE,60),
  ('packing','Packing and dispatch readiness','Check, label and pack everything required for dispatch.','packing',-2,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,70),
  ('transport','Transport to site','Load and deliver materials, equipment and finished work to site.','transport',-1,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,TRUE,80),
  ('installation','Installation / build','Install or build the approved work at the confirmed location.','installation',0,12,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,TRUE,90),
  ('event-support','Live event support','Provide on-site operational or technical support during the event.','event_support',0,12,ARRAY['graduation-ceremonies','corporate-events-branding','exhibition-stands'],TRUE,FALSE,100),
  ('dismantling','Dismantling','Safely dismantle temporary work after the event or campaign.','dismantling',1,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','btl-mall-installations','btl-supermarket-hypermarket'],TRUE,TRUE,110),
  ('return','Return and reconciliation','Return reusable assets, record loss or damage, and reconcile remaining materials.','return',2,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','btl-mall-installations','btl-supermarket-hypermarket'],FALSE,FALSE,120),
  ('handover','Handover and final photographs','Confirm physical delivery and capture final photographic evidence.','other',1,2,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,FALSE,130)
ON CONFLICT (stable_code) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, activity_type=EXCLUDED.activity_type,
  days_from_target=EXCLUDED.days_from_target, duration_hours=EXCLUDED.duration_hours,
  applicable_service_codes=EXCLUDED.applicable_service_codes, requires_location=EXCLUDED.requires_location,
  requires_work_package=EXCLUDED.requires_work_package, display_order=EXCLUDED.display_order, updated_at=NOW();
