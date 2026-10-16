import type { Therapy } from '../db/types.js';
import { Layout } from './Layout.js';

type TherapiesListProps = { therapies: Therapy[] };

export function TherapiesList({ therapies }: TherapiesListProps) {
  return (
    <Layout title="疗法目录 · AgentClinic">
      <h2 id="therapies-heading">疗法目录</h2>
      {therapies.length === 0 ? (
        <p>暂无疗法</p>
      ) : (
        <div
          class="ailment-table-region"
          role="region"
          aria-label="疗法目录"
          tabindex={0}
        >
          <table class="ailment-table" aria-labelledby="therapies-heading">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">描述</th>
              </tr>
            </thead>
            <tbody>
              {therapies.map((therapy) => (
                <tr key={therapy.id}>
                  <td>{therapy.name}</td>
                  <td>{therapy.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
