import ContractView from "./ContractView";

export const dynamic = "force-dynamic";

export default function PublicContractPage({ params }: { params: { token: string } }) {
  return <ContractView token={params.token} />;
}
