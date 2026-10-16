import type { Ailment } from '../db/types.js';
import { Layout } from './Layout.js';

type AilmentsListProps = { ailments: Ailment[] };

export function AilmentsList({ ailments }: AilmentsListProps) {
  return (
    <Layout title="病症目录 · AgentClinic">
      <h2 id="ailments-heading">病症目录</h2>
      {ailments.length === 0 ? (
        <p>暂无病症</p>
      ) : (
        <div
          class="ailment-table-region"
          role="region"
          aria-label="病症目录"
          tabindex={0}
        >
          <table class="ailment-table" aria-labelledby="ailments-heading">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">描述</th>
              </tr>
            </thead>
            <tbody>
              {ailments.map((ailment) => (
                <tr key={ailment.id}>
                  <td>{ailment.name}</td>
                  <td>{ailment.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
