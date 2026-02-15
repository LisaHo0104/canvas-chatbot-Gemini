import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import Link from "next/link";
import "nextra-theme-docs/style.css";
import { DocsNavbarExtras } from "@/components/DocsNavbarExtras";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageMap = await getPageMap("/docs");
  const navbar = (
    <Navbar
      logo={
        <Link href="/" className="flex items-center gap-2" aria-label="Lulu Home">
          <img src="/dog_logo.png" alt="Lulu logo" className="h-8 w-auto" />
          <span>Lulu</span>
        </Link>
      }
    >
      <DocsNavbarExtras />
    </Navbar>
  );
  const footer = (
    <Footer>
      © {new Date().getFullYear()} Lulu — Canvas chatbot and study assistant
    </Footer>
  );

  return (
    <Layout
      navbar={navbar}
      footer={footer}
      sidebar={{ defaultMenuCollapseLevel: 1 }}
      pageMap={pageMap}
      editLink={null}
      feedback={{ content: null }}
    >
      {children}
    </Layout>
  );
}
