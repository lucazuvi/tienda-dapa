-- ============================================================================
-- D.A.P.A. REPUESTOS MOLLE - POLÍTICAS DE SEGURIDAD RLS PARA SUPABASE
-- Ejecutá este script en el SQL Editor de tu panel de Supabase para proteger
-- las tablas contra modificaciones no autorizadas desde el cliente público.
-- ============================================================================

-- 1. Habilitar RLS en todas las tablas principales
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 2. Función auxiliar para verificar si el usuario autenticado es el administrador
CREATE OR REPLACE FUNCTION public.is_dapa_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(LOWER(auth.jwt() ->> 'email') = 'admin@dapa.com', false);
$$;

-- ============================================================================
-- POLÍTICAS PARA PRODUCTOS, CATEGORÍAS Y MARCAS
-- Lectura pública para todos; Escritura (INSERT/UPDATE/DELETE) solo Admin
-- ============================================================================

DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_dapa_admin())
  WITH CHECK (public.is_dapa_admin());

DROP POLICY IF EXISTS "Public select categories" ON public.categories;
CREATE POLICY "Public select categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;
CREATE POLICY "Admin full access categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_dapa_admin())
  WITH CHECK (public.is_dapa_admin());

DROP POLICY IF EXISTS "Public select brands" ON public.brands;
CREATE POLICY "Public select brands"
  ON public.brands FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full access brands" ON public.brands;
CREATE POLICY "Admin full access brands"
  ON public.brands FOR ALL
  TO authenticated
  USING (public.is_dapa_admin())
  WITH CHECK (public.is_dapa_admin());

-- ============================================================================
-- POLÍTICAS PARA PEDIDOS (orders) Y DETALLE DE PEDIDOS (order_items)
-- Cualquier comprador puede crear pedidos (INSERT) y consultar estado,
-- pero SOLO el Admin o el Webhook (service_role) puede modificar/borrar.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Customers and admin can view orders" ON public.orders;
CREATE POLICY "Customers and admin can view orders"
  ON public.orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admin can update orders" ON public.orders;
CREATE POLICY "Only admin can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_dapa_admin())
  WITH CHECK (public.is_dapa_admin());

DROP POLICY IF EXISTS "Only admin can delete orders" ON public.orders;
CREATE POLICY "Only admin can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_dapa_admin());

DROP POLICY IF EXISTS "Anyone can insert order_items" ON public.order_items;
CREATE POLICY "Anyone can insert order_items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view order_items" ON public.order_items;
CREATE POLICY "Anyone can view order_items"
  ON public.order_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admin can modify order_items" ON public.order_items;
CREATE POLICY "Only admin can modify order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_dapa_admin())
  WITH CHECK (public.is_dapa_admin());
