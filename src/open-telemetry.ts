// Import required symbols
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeTracerProvider } from '@opentelemetry/node';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { Resource } from '@opentelemetry/resources';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';

// **DELETE IF SETTING UP A GATEWAY, UNCOMMENT OTHERWISE**
// const { GraphQLInstrumentation } = require ('@opentelemetry/instrumentation-graphql');

// Register server-related instrumentation
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    // **DELETE IF SETTING UP A GATEWAY, UNCOMMENT OTHERWISE**
    //new GraphQLInstrumentation()
  ],
});

// Initialize provider and identify this particular service
// (in this case, we're implementing a federated gateway)
const provider = new NodeTracerProvider({
  resource: Resource.default().merge(
    new Resource({
      // Replace with any string to identify this service in your system
      'service.name': 'auth',
    }),
  ),
});

// Configure a test exporter to print all traces to the console
// const consoleExporter = new ConsoleSpanExporter();
// provider.addSpanProcessor(
//   new SimpleSpanProcessor(consoleExporter)
// );

const zipkinExporter = new ZipkinExporter({
  url: 'http://localhost:9411/api/v2/spans',
});
provider.addSpanProcessor(new SimpleSpanProcessor(zipkinExporter));

// Register the provider to begin tracing
provider.register();
